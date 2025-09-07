from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.cache import cache
from django.core.mail import send_mail

from .paginators import Pagination
from .perms import OwnerPermission, AdminPermission, AllowAllPermission
from rest_framework.permissions import IsAuthenticated, AllowAny
import random
from .serializers import UserSerializer, ChangePasswordSerializer, ChatSessionSerializer, MessageSerializer, \
    KnowledgeBaseSerializer, SendOTPSerializer, VerifyOTPSerializer, ChangePWForgetSerializer
from rest_framework.response import Response
from rest_framework import status
from .models import User, ChatSession, Message, KnowledgeBase
from .utils.rag import RAGSystem
import os

rag_system = RAGSystem()


# Create your views here.

class UserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ["change_password", "get_current_user", "update_profile"]:
            return [OwnerPermission()]
        if self.action in ["get_all_users", "get_user_by_id", "status"]:
            return [AdminPermission()]
        if self.action in ["send_otp", "verify_otp", "reset_password"]:
            return [AllowAllPermission()]
        return [IsAuthenticated()]

    @action(methods=['get'], url_path='all-users', detail=False)
    def get_all_users(self, request):
        self.check_permissions(request)
        queryset = User.objects.filter(is_active=True)

        paginator = Pagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)

        serializer = UserSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(methods=['get'], url_path='by-id/(?P<id>[^/.]+)', detail=False)
    def get_user_by_id(self, request, **kwargs):
        user_id = kwargs.get('id')
        self.check_permissions(request)
        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "Người dùng không tồn tại hoặc đã bị khóa."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='status/(?P<id>[^/.]+)', detail=False)
    def status(self, request, **kwargs):
        user_id = kwargs.get('id')
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Người dùng không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])

        status_text = "đã bị khóa" if not user.is_active else "đã được mở khóa"

        return Response({"message": f"Tài khoản {user.username} {status_text}."}, status=status.HTTP_200_OK)

    @action(methods=['get'], url_path='current', detail=False)
    def get_current_user(self, request):
        user = request.user
        self.check_object_permissions(request, user)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='change-password', detail=False)
    def change_password(self, request):
        user = request.user
        self.check_object_permissions(request, user)

        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])

            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['patch'], url_path='profile', detail=False)
    def update_profile(self, request):
        user = request.user
        self.check_object_permissions(request, user)

        serializer = UserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['post'], url_path='send-otp', detail=False)
    def send_otp(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "Email này không tồn tại trong hệ thống."}, status=status.HTTP_404_NOT_FOUND)

        otp_code = f"{random.randint(100000, 999999)}"

        cache.set(f"otp_{email}", otp_code, timeout=300)

        send_mail(
            subject="Mã OTP xác thực",
            message=f"Mã OTP của bạn là: {otp_code}. Mã này có hiệu lực trong 5 phút.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return Response({"message": "Mã OTP đã được gửi đến email của bạn."}, status=status.HTTP_200_OK)

    @action(methods=['post'], url_path='verify-otp', detail=False)
    def verify_otp(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        cached_otp = cache.get(f"otp_{email}")
        if cached_otp and cached_otp == otp:
            cache.delete(f"otp_{email}")
            cache.set(f"otp_verified_{email}", True, timeout=600)
            return Response(status=status.HTTP_200_OK)

        return Response({"error": "OTP không hợp lệ hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['post'], url_path='reset-password', detail=False)
    def reset_password(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Vui lòng nhập email."}, status=status.HTTP_400_BAD_REQUEST)

        verified_key = f"otp_verified_{email}"
        if not cache.get(verified_key):
            return Response({"error": "OTP chưa được xác thực hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ChangePWForgetSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.get(email=email, is_active=True)
            except User.DoesNotExist:
                return Response({"error": "Không tìm thấy người dùng."}, status=status.HTTP_404_NOT_FOUND)

            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])
            cache.delete(verified_key)
            return Response({"message": "Mật khẩu đã được đặt lại thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def create(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChatSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, OwnerPermission]

    def list(self, request):
        queryset = ChatSession.objects.filter(user=request.user)

        paginator = Pagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)

        serializer = ChatSessionSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    def create(self, request):
        serializer = ChatSessionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        try:
            chat_session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ChatSessionSerializer(chat_session)
        return Response(serializer.data)

    def update(self, request, pk=None):
        try:
            chat_session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ChatSessionSerializer(
            chat_session,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            chat_session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        chat_session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, OwnerPermission]

    def list(self, request, session_id=None):
        try:
            chat_session = ChatSession.objects.get(pk=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        messages = chat_session.messages.all().order_by('created_date')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def create(self, request, session_id=None):
        try:
            chat_session = ChatSession.objects.get(pk=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        messages = chat_session.messages.all().order_by('created_date')
        chat_history = []

        for i in range(0, len(messages) - 1, 2):
            if i + 1 < len(messages):
                human_msg = messages[i]
                ai_msg = messages[i + 1]
                if human_msg.sender == 'human' and ai_msg.sender == 'ai':
                    chat_history.append((human_msg.text, ai_msg.text))

        # Lưu tin nhắn của người dùng
        user_message = Message.objects.create(
            sender='human',
            text=request.data.get('text', ''),
            session=chat_session
        )

        # Nhận AI response từ RAG
        ai_response = rag_system.query(
            question=request.data.get('text', ''),
            chat_history=chat_history
        )

        # Lưu AI response
        ai_message = Message.objects.create(
            sender='ai',
            text=ai_response,
            session=chat_session
        )

        serializer = MessageSerializer([user_message, ai_message], many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class KnowledgeBaseViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, AdminPermission]
    parser_classes = [MultiPartParser, FormParser]

    def list(self, request):
        queryset = KnowledgeBase.objects.all()

        paginator = Pagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)

        serializer = KnowledgeBaseSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            knowledge = KnowledgeBase.objects.get(pk=pk)
        except KnowledgeBase.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = KnowledgeBaseSerializer(knowledge)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        files = request.FILES.getlist('file')
        if not files:
            return Response({"error": "Không có file nào được upload."}, status=status.HTTP_400_BAD_REQUEST)

        created_objects = []
        for f in files:
            knowledge = KnowledgeBase.objects.create(
                title=request.data.get('title', ''),
                description=request.data.get('description', ''),
                file=f,
                uploaded_by=request.user
            )
            created_objects.append(knowledge)

            file_path = os.path.join(settings.MEDIA_ROOT, knowledge.file.name)
            rag_system.add_documents(file_path)

        serializer = KnowledgeBaseSerializer(created_objects, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        try:
            knowledge = KnowledgeBase.objects.get(pk=pk)
        except KnowledgeBase.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        file_path = os.path.join(settings.MEDIA_ROOT, knowledge.file.name)

        try:
            rag_system.vectorstore.delete(where={"source": file_path})

        except Exception as e:
            print(f"Lỗi khi xóa khỏi vectorstore: {e}")

        if os.path.exists(file_path):
            os.remove(file_path)

        knowledge.delete()
        return Response({"success": "File đã được xóa."}, status=status.HTTP_204_NO_CONTENT)
