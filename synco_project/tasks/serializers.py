# tell the DRF how to convert your Task model to JSON data that your extension can understand

from rest_framework import serializers
from .models import Task
from django.contrib.auth.models import User

class TaskSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = Task
        fields = ['id', 'text', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']
        
