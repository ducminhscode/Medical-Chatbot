from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register('user', views.UserViewSet, basename='user')
router.register('chat-sessions', views.ChatSessionViewSet, basename='chat-sessions')
router.register('knowledge', views.KnowledgeBaseViewSet, basename='knowledge')

urlpatterns = [
    path('', include(router.urls)),
    path('chat-sessions/<uuid:session_id>/messages/', views.MessageViewSet.as_view({'get': 'list','post': 'create'}), name='session-messages'),
]
