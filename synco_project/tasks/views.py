from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Task, Group
from .serializers import TaskSerializer, GroupSerializer
from .permissions import IsOwnerOrReadOnly # Assuming you have this for tasks
from django.db.models import Q # Import the Q object for complex lookups

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_list(request):
    """
    List tasks based on group selection, or create a new task.
    """
    if request.method == 'GET':
        # ✨ THE FIX: Check for filtering parameters from the URL
        group_id = request.query_params.get('group')
        is_personal_group = request.query_params.get('group__isnull') == 'True'

        if is_personal_group:
            # If "Personal" group is selected, show only tasks with a null group
            tasks = Task.objects.filter(user=request.user, group__isnull=True)
        elif group_id:
            # If a specific group is selected, filter by that group's ID
            # Also, ensure the user is a member of that group for security
            try:
                # This ensures the user is a member before showing the tasks
                group = Group.objects.get(id=group_id, members=request.user)
                tasks = Task.objects.filter(group=group)
            except Group.DoesNotExist:
                return Response({"error": "Group not found or you are not a member."},
                                status=status.HTTP_404_NOT_FOUND)
        else:
            # Default case (if no filter is applied)
            # Combine personal tasks and tasks from groups the user is a member of
            personal_tasks = Task.objects.filter(user=request.user, group__isnull=True)
            group_tasks = Task.objects.filter(group__members=request.user)
            tasks = (personal_tasks | group_tasks).distinct()

        serializer = TaskSerializer(tasks.order_by('-created_at'), many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.validated_data.get('group')
            if group:
                if request.user not in group.members.all():
                    return Response({'error': 'You do not have permission to add tasks to this group.'},
                                    status=status.HTTP_403_FORBIDDEN)
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def task_detail(request, pk):
    """
    Retrieve, update, or delete a task.
    """
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = TaskSerializer(task, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def group_list(request):
    """
    List all groups for the authenticated user, or create a new group.
    """
    if request.method == 'GET':
        groups = Group.objects.filter(members=request.user).distinct()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.save()
            group.members.add(request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✨ ADD THIS NEW VIEW FUNCTION TO YOUR FILE ✨
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):
    """
    Retrieve, update, or delete a group.
    Only group members can access. Only the creator (or an admin) could delete.
    For simplicity, we'll allow any member to delete for now.
    """
    try:
        group = Group.objects.get(pk=pk)
    except Group.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # Security check: Only members of the group can view/edit/delete it
    if request.user not in group.members.all():
        return Response({'error': 'You do not have permission to access this group.'},
                        status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = GroupSerializer(group)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = GroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)