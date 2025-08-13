from django.contrib import admin
from .models import *

admin.site.register(KnowledgeBase)
admin.site.register(User)
admin.site.register(ChatSession)
admin.site.register(Message)

# Register your models here.
