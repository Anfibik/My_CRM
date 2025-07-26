import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Q


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # --- НАЧАЛО ДИАГНОСТИЧЕСКОГО БЛОКА ---
        print("--- [DIAGNOSTIC] WebSocket connect attempt ---")
        
        user = self.scope.get('user')
        
        # Выводим всего пользователя и его статус аутентификации
        print(f"--- [DIAGNOSTIC] Scope user: {user}")
        print(f"--- [DIAGNOSTIC] Is authenticated: {user.is_authenticated}")
        
        # Выводим заголовки, чтобы проверить наличие cookie
        headers = dict(self.scope['headers'])
        print(f"--- [DIAGNOSTIC] Request headers: {headers}")
        # --- КОНЕЦ ДИАГНОСТИЧЕСКОГО БЛОКА ---

        if user and user.is_authenticated:
            self.user = user
            self.user_id = self.user.id
            await self.accept()
            print(f"--- Connection ACCEPTED for user {self.user_id} ---")
            
            # Добавляем пользователя в его личную группу для уведомлений
            await self.channel_layer.group_add(
                f"user_{self.user_id}",
                self.channel_name
            )
        else:
            print("--- Connection REJECTED ---")
            await self.close()


    @database_sync_to_async
    def get_user_task_groups(self):
        from .models import Task
        # Находим все задачи, где пользователь является автором, исполнителем, участником или наблюдателем
        tasks = Task.objects.filter(
            Q(author=self.user) |
            Q(executor=self.user) |
            Q(participants=self.user) |
            Q(observers=self.user)
        ).distinct()
        return [f'task_{task.id}' for task in tasks]

    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_id = self.user.id
        self.user_group_name = f'user_{self.user_id}'

        # Подписка на персональную группу
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        print(f"User {self.user_id} connected, joined personal group: {self.user_group_name}")

        # Получаем и подписываемся на группы всех связанных задач
        self.task_groups = await self.get_user_task_groups()
        for group_name in self.task_groups:
            await self.channel_layer.group_add(group_name, self.channel_name)
        
        print(f"User {self.user_id} subscribed to task groups: {self.task_groups}")

        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Successfully connected to WebSocket!'
        }))

    async def disconnect(self, close_code):
        if not hasattr(self, 'user') or not self.user.is_authenticated:
            return

        # Отписка от персональной группы
        await self.channel_layer.group_discard(self.user_group_name, self.channel_name)
        print(f"User {self.user_id} disconnected, removed from personal group: {self.user_group_name}")

        # Отписка от всех групп задач
        if hasattr(self, 'task_groups'):
            for group_name in self.task_groups:
                await self.channel_layer.group_discard(group_name, self.channel_name)
            print(f"User {self.user_id} unsubscribed from task groups: {self.task_groups}")

    async def data_update(self, event):
        """
        Обрабатывает сообщения об обновлении данных, отправленные из views.py (например, новые комментарии).
        """
        payload = event['payload']
        print(f"Sending 'data_update' to user {self.user_id} with payload: {payload}")
        await self.send(text_data=json.dumps({
            'type': 'data_update',
            'data': payload
        }))

    async def data_update_message(self, event):
        """
        Обрабатывает сообщения, отправленные из сигналов (например, при изменении статуса задачи).
        """
        update_data = event['data']
        print(f"Sending 'data_update_message' to user {self.user_id}: {update_data}")
        await self.send(text_data=json.dumps({
            'type': 'data_update',
            'data': update_data
        }))
