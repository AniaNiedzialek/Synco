from rest_framework import permissions

class IsOwnerOrGroupMember(permissions.BasePermission):
    # custom permission to only allow owners of an object or memebers of the group to edit the object

    def has_object_permission(selff, requet, view, obj):
        # read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # write permissions are only allowed to the owner of the snipper
        if obj.user and obj.user == request.user:
            return True

        # allow access if the user is a member of the group
        if obj.group and request.user in obj.group.members.all():
            return True
        return False