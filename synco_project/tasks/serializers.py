# tell the DRF how to convert your Task model to JSON data that your extension can understand

from rest_framework import serializers
from .models import Task
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'text', 'created_at']
        