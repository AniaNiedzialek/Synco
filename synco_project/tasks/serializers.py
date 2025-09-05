from rest_framework import serializers
from .models import Task, Group
from django.contrib.auth.models import User

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class TaskSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all(), required=False)

    class Meta:
        model = Task
        fields = ['id', 'text', 'created_at', 'user', 'group']
        read_only_fields = ['id', 'created_at', 'user']