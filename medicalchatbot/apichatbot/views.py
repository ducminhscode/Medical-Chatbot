from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from .perms import OwnerPermission, AdminPermission
from rest_framework.permissions import IsAuthenticated

from .serializers import UserSerializer, ChangePasswordSerializer, ChatSessionSerializer, MessageSerializer, \
    KnowledgeBaseSerializer
from rest_framework.response import Response
from rest_framework import status
from .models import User, ChatSession, Message, KnowledgeBase
from .utils.rag import RAGSystem
import os

rag_system = RAGSystem()
# Create your views here.

class UserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ["change_password", "get_current_user"]:
            return [OwnerPermission()]
        return [IsAuthenticated()]

    @action(methods=['get'], url_path='all-users', detail=False)
    def get_all_users(self, request):
        self.check_permissions(request)
        queryset = User.objects.filter(is_active=True)
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

            if hasattr(user, 'teacher') and user.teacher.must_change_password:
                teacher = user.teacher
                teacher.must_change_password = False
                teacher.password_reset_time = None
                teacher.save(update_fields=['must_change_password', 'password_reset_time'])

            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChatSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, OwnerPermission]

    def list(self, request):
        queryset = ChatSession.objects.filter(user=request.user)
        serializer = ChatSessionSerializer(queryset, many=True)
        return Response(serializer.data)

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

        # Lấy lịch sử trò chuyện để biết bối cảnh
        chat_history = [
            (msg.text, msg.sender)
            for msg in chat_session.messages.all().order_by('created_date')
        ]

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

    def list(self, request):
        queryset = KnowledgeBase.objects.filter(is_active=True)
        serializer = KnowledgeBaseSerializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = KnowledgeBaseSerializer(data=request.data)
        if serializer.is_valid():
            knowledge = serializer.save(uploaded_by=request.user)

            # Thêm tài liệu vào RAG
            file_path = os.path.join(settings.MEDIA_ROOT, knowledge.file.name)
            rag_system.add_documents(file_path)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            knowledge = KnowledgeBase.objects.get(pk=pk)
        except KnowledgeBase.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        knowledge.is_active = False
        knowledge.save()
        return Response(status=status.HTTP_204_NO_CONTENT)