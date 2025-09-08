from rest_framework import serializers
from .models import Task, Group
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        # ✨ CORRECTED: 'due_date' is replaced with 'priority'
        fields = ['id', 'text', 'completed', 'group', 'user', 'created_at', 'priority']
        read_only_fields = ['user', 'created_at']

class GroupSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'members']