from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, Group

class TaskSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username') # Display username instead of user ID
    group_name = serializers.ReadOnlyField(source='group.name') # Add group name for display

    class Meta:
        model = Task
        fields = ['id', 'user', 'text', 'completed', 'created_at', 'group', 'group_name']
        read_only_fields = ['user', 'created_at']

class GroupSerializer(serializers.ModelSerializer):
    # This will return a list of usernames for the members
    members = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='username' # ✨ NEW: Specify to use 'username' for the related User objects
    )
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'members']
        read_only_fields = ['id'] # Group ID is read-only