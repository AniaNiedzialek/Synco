from django.db import models
from django.contrib.auth.models import User

class Group(models.Model):
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(User, related_name='synco_groups') 
    
    def __str__(self):
        return self.name

class Task(models.Model):
    # Make the user field optional so that tasks can belong to a group
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    text = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.text