from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser

from .perms import OwnerPermission, AdminPermission
from rest_framework.permissions import IsAuthenticated, AllowAny

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
        if self.action in ["change_password", "get_current_user", "update_profile"]:
            return [OwnerPermission()]
        if self.action == "get_all_users":
            return [AdminPermission()]
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
        serializer = KnowledgeBaseSerializer(queryset, many=True)
        return Response(serializer.data)

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
        return Response({"success": "File đã được xóa."},status=status.HTTP_204_NO_CONTENT)