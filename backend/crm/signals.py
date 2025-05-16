# g:\Programming\My_python_project\My_CRM\backend\crm\signals.py
import json
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Task

@receiver(post_save, sender=Task)
def task_post_save_handler(sender, instance, created, **kwargs):
    print(f"--- Signal task_post_save_handler triggered for task ID: {instance.id}, Created: {created}. STEP 3.3 (models.py reviewed) ---")
    
    channel_layer = get_channel_layer()
    if not channel_layer:
        print("--- Signal Error: channel_layer is None! ---")
        return
    print("--- Signal: channel_layer obtained successfully. ---")

    group_name = 'tasks_updates'
    action = 'created' if created else 'updated'
    print(f"--- Signal: Group: {group_name}, Action: {action} ---")

    actor_user_id = None
    # Попытка получить request из kwargs, если он там есть (может помочь для actor_user_id)
    request = kwargs.get('request', None) 
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        actor_user_id = request.user.id
    elif created and instance.author: # Фоллбэк, если request недоступен
        actor_user_id = instance.author.id
    print(f"--- Signal: Actor User ID: {actor_user_id} ---")

    # Безопасно получаем значения, особенно для полей, которых может не быть или которые могут быть None
    completed_at_value = getattr(instance, 'completed_at', None)
    task_type_value = getattr(instance, 'task_type', None) # task_type имеет default, но getattr безопаснее
    
    task_data = {
        'id': instance.id,
        'title': instance.title,
        'task_type': task_type_value, 
        'status': instance.status,
        'priority': instance.priority,
        'deadline': instance.deadline.isoformat() if instance.deadline else None,
        'description': instance.description,
        'created_at': instance.created_at.isoformat() if instance.created_at else None, # auto_now_add, всегда будет
        'updated_at': instance.updated_at.isoformat() if instance.updated_at else None, # auto_now, всегда будет
        'completed_at': completed_at_value.isoformat() if completed_at_value else None,
        'deal_id': instance.deal.id if instance.deal else None,
        'author_id': instance.author.id if instance.author else None,
        'executor_id': instance.executor.id if instance.executor else None,
        'participants_ids': [user.id for user in instance.participants.all()],
        'observers_ids': [user.id for user in instance.observers.all()],
    }
    print(f"--- Signal: Task Data Prepared: {json.dumps(task_data, indent=2, ensure_ascii=False)} ---")

    message_data = {
        'type': 'task_update', # Тип сообщения для WebSocket клиента
        'action': action,       # 'created' или 'updated'
        'actor_user_id': actor_user_id, # ID пользователя, вызвавшего изменение (если доступно)
        'task': task_data
    }
    print(f"--- Signal: Message Data Prepared: {json.dumps(message_data, indent=2, ensure_ascii=False)} ---")
    
    final_message_to_send = {
        'type': 'data_update_message', # Этот тип ожидает NotificationConsumer
        'data': message_data
    }

    def send_message_on_commit():
        try:
            print(f"--- Signal: Attempting to send message to group {group_name} on commit ---")
            async_to_sync(channel_layer.group_send)(
                group_name,
                final_message_to_send
            )
            print(f"--- Signal: Message sent successfully to group {group_name} ---")
        except Exception as e:
            print(f"--- Signal Error: Exception during group_send: {e} ---")
            # Здесь можно добавить более детальное логирование ошибки, если необходимо
            # import traceback
            # print(traceback.format_exc())

    transaction.on_commit(send_message_on_commit)
    print(f"--- Signal: send_message_on_commit scheduled for transaction commit ---")
