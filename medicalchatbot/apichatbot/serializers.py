from rest_framework.serializers import ModelSerializer, Serializer, CharField
from rest_framework import serializers
from .models import User, ChatSession, Message, KnowledgeBase

class UserSerializer(ModelSerializer):
    def create(self, validated_data):
        data = validated_data.copy()
        u = User(**data)
        u.role = 0
        u.set_password(u.password)
        u.save()
        return u

    def update(self, instance, validated_data):
        if 'username' in validated_data:
            validated_data.pop('username', None)
            raise serializers.ValidationError("Không thể thay đổi tên đăng nhập.")

        if 'role' in validated_data:
            validated_data.pop('role', None)
            raise serializers.ValidationError("Yêu cầu bị từ chối.")

        validated_data.pop('password', None)
        return super().update(instance, validated_data)

    class Meta:
        model = User
        fields = ["id", "username", "password", "avatar", "first_name", "last_name", "email", "is_male", "date_of_birth", "role"]
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }
        read_only_fields = ['id', 'username', 'email', 'role']

class ChangePasswordSerializer(Serializer):
    current_password = CharField(write_only=True, required=True)
    new_password = CharField(write_only=True, required=True)
    confirm_password = CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng.")
        return value

class ChatSessionSerializer(ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ['id', 'session_name', 'created_date', 'updated_date', 'user']
        read_only_fields = ['id', 'created_date', 'user']

class MessageSerializer(ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'created_date', 'session']
        read_only_fields = ['id', 'created_date']

class KnowledgeBaseSerializer(ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'title', 'description', 'file', 'uploaded_by', 'created_date']
        read_only_fields = ['id', 'uploaded_by', 'created_date']