import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['user'].id if self.scope['user'].is_authenticated else None
        self.tasks_group_name = 'tasks_updates' # Группа для обновлений задач

        if self.user_id:
            self.user_group_name = f'user_{self.user_id}'
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            print(f"User {self.user_id} connected, channel_name: {self.channel_name}, joined group: {self.user_group_name}")
        else:
            print(f"Anonymous user connected, channel_name: {self.channel_name}")

        # Все пользователи (аутентифицированные и анонимные, если разрешено) подписываются на обновления задач
        await self.channel_layer.group_add(
            self.tasks_group_name,
            self.channel_name
        )
        print(f"Channel {self.channel_name} joined group: {self.tasks_group_name}")

        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Successfully connected to WebSocket!'
        }))
        
        # Это тестовое уведомление можно оставить или убрать, если оно больше не нужно для отладки
        # await self.send(text_data=json.dumps({
        #     'type': 'notification',
        #     'payload': {
        #         'title': 'Тестовое событие!',
        #         'message': 'Это тестовое уведомление отправлено с сервера сразу после подключения.',
        #         'level': 'info'
        #     }
        # }))

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name') and self.user_group_name:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            print(f"User {self.user_id} disconnected, removed from group: {self.user_group_name}")
        
        # Отписка от группы обновлений задач
        await self.channel_layer.group_discard(
            self.tasks_group_name,
            self.channel_name
        )
        print(f"Channel {self.channel_name} removed from group: {self.tasks_group_name}")

        if not hasattr(self, 'user_group_name') or not self.user_group_name : # если был аноним
             print(f"Anonymous/Unidentified user disconnected, channel_name: {self.channel_name}")


    async def send_notification(self, event): # Этот метод для "старых" уведомлений, если они еще используются
        message_content = event['message']
        print(f"Sending legacy notification to user {self.user_id} via WebSocket: {message_content}")
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'payload': message_content
        }))

    # Новый метод для обработки сообщений об обновлении данных
    async def data_update_message(self, event):
        """
        Отправляет сообщение об обновлении данных клиенту.
        'event' содержит {'type': 'data_update_message', 'data': message_data_from_signal}
        """
        update_data = event['data'] # Это message_data из сигнала
        
        print(f"Sending data update to channel {self.channel_name} for group {self.tasks_group_name}: {update_data}")

        # Отправляем клиенту сообщение с типом 'data_update'
        await self.send(text_data=json.dumps({
            'type': 'data_update', # Этот тип будет ловить фронтенд
            'data': update_data
        }))
