import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack  # Для аутентификации в WebSockets
import crm.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
# Базовое Django ASGI приложение для HTTP запросов
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            crm.routing.websocket_urlpatterns  # Пути для WebSocket
        )
    ),
})
