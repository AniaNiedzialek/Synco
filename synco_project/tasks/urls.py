from django.urls import path
from . import views
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('tasks/', views.task_list, name='task_list'),
    path('tasks/<int:pk>/', views.task_detail, name='task_detail'),
    path('groups/', views.group_list, name='group_list'),
    path('groups/<int:pk>/', views.group_detail, name='group_detail'), 
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('register/', views.register_user, name='register_user'),

    # URL for managing group members
    path('groups/<int:pk>/members/', views.group_members, name='group_members'),
]