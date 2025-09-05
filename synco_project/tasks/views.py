from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Task, Group
from .serializers import TaskSerializer, GroupSerializer
from .permissions import IsOwnerOrReadOnly

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_list(request):
    """
    List all tasks for the authenticated user (personal and group),
    or create a new task.
    """
    if request.method == 'GET':
        # Get tasks that are owned by the user (personal tasks)
        personal_tasks = Task.objects.filter(user=request.user, group__isnull=True)
        # Get tasks from groups the user is a member of
        group_tasks = Task.objects.filter(group__members=request.user)
        # Combine and order all tasks
        all_tasks = (personal_tasks | group_tasks).distinct().order_by('-created_at')
        serializer = TaskSerializer(all_tasks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.validated_data.get('group')
            # Check if a group was provided and if the user is a member of it
            if group: # If a group is specified
                if request.user not in group.members.all():
                    return Response({'error': 'You do not have permission to add tasks to this group.'},
                                    status=status.HTTP_403_FORBIDDEN)
            # Save the task, associating it with the creating user
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
        task = Task.objects.get(pk=pk) # <-- CHANGED: Fetch task by PK first
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # NOW, check object-level permission using the decorator's logic
    # This will use IsOwnerOrReadOnly to determine if the user has rights for GET, PUT, or DELETE.
    # The permission_classes decorator automatically calls check_object_permissions for us
    # if the view is a class-based view or if the request method requires it.
    # For function-based views, DRF needs a little help to explicitly check object permissions.
    # The @permission_classes decorator on @api_view handles it implicitly for basic cases,
    # but for `has_object_permission`, we need to ensure the permission class is invoked.
    # For simplicity with function-based views, DRF's @permission_classes usually works fine
    # once the object is retrieved, as long as `request.user` is available.
    # The key fix here is removing the `user=request.user` from the `.get()`

    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = TaskSerializer(task, data=request.data, partial=True)
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
        groups = Group.objects.filter(members=request.user).distinct() # Use distinct to avoid duplicates if user is added multiple ways
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.save()
            group.members.add(request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)