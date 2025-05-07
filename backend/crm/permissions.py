from rest_framework import permissions

class IsDealAccess(permissions.BasePermission):
    """
    Разрешает доступ к сделкам:
    - owner и top_manager: полный доступ
    - ответственный и соучастник: доступ к своей сделке
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        # Полный доступ для владельца и топ-менеджера
        if user.role in ('owner', 'top_manager'):
            return True
        # Доступ ответственного менеджера
        if getattr(obj, 'responsible', None) == user:
            return True
        # Доступ аккаунт-менеджера, отмеченного в сделке
        if getattr(obj, 'account', None) == user:
            return True
        # Доступ соучастников
        if user in getattr(obj, 'participants', []).all():
            return True
        return False

class NotCallOperator(permissions.BasePermission):
    """
    Denies access for users with role 'call_operator'.
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        # allow only authenticated users whose role is not call_operator
        return bool(user and user.is_authenticated and user.role != 'call_operator')
