from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Task(models.Model):
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    # tells django that each task is linked ot a user, for now avoiding issues
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)


    def __str__(self):
        return self.text