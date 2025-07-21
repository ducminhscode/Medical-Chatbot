from enum import IntEnum

from django.db import models
from django.contrib.auth.models import AbstractUser
from cloudinary.models import CloudinaryField
import uuid

class BaseModel(models.Model):
    created_date = models.DateTimeField(auto_now_add=True, null=True)
    updated_date = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        abstract = True
        ordering = ["-id"]


class Role(IntEnum):
    ADMIN = 1
    USER = 0

    @classmethod
    def choices(cls):
        return [(role.value, role.name.capitalize()) for role in cls]


class User(AbstractUser):
    avatar = CloudinaryField('avatar', null=False, blank=False, folder='ChatBot',
                             default='https://res.cloudinary.com/dp9b0dkkt/image/upload/v1745512749/de995be2-6311-4125-9ac2-19e11fcaf801_jo8gcs.png')
    email = models.EmailField(unique=True, null=False, max_length=255)
    is_male = models.BooleanField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    role = models.IntegerField(
        choices=Role.choices(),
        default=Role.USER.value
    )

    class Meta:
        ordering = ['id']

class KnowledgeBase(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    file = models.FileField(upload_to='knowledge_base/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.title

class ChatSession(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    session_name = models.CharField(max_length=255, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False)

    @property
    def messages(self):
        return self.messages.all()

    def __str__(self):
        return str(self.id)


class Message(BaseModel):
    sender = models.CharField(max_length=10, choices=(('human', 'Human'), ('ai', 'AI')))
    text = models.TextField()
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')

    def __str__(self):
        return f"[{self.role.upper()}] {self.message[:50]}"
