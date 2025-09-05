from django.db import models
from django.conf import settings
from django.contrib.auth.models import User

class Group(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name='task_groups')

    def __str__(self):
        return self.name

class Task(models.Model):
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    completed = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    


    def __str__(self):
        return self.text