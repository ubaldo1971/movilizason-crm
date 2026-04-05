import TaskCard from './TaskCard';

export default function ChatBubble({ message, isOwn, currentUserId, onUpdateTask, conversationId }) {
  const isTask = message.type === 'task';
  const time = message.sentAt?.toDate ? message.sentAt.toDate() : (message.sentAt ? new Date(message.sentAt) : new Date());

  return (
    <div className={`chat-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="chat-bubble-sender">
          <span className="chat-sender-name">{message.senderName || 'Usuario'}</span>
          <span className="chat-sender-role">{message.senderRole || ''}</span>
        </div>
      )}

      <div className={`chat-bubble ${isOwn ? 'own' : 'other'} ${isTask ? 'task' : ''}`}>
        {isTask && message.taskData ? (
          <TaskCard
            taskData={message.taskData}
            messageId={message.id}
            conversationId={conversationId}
            currentUserId={currentUserId}
            onUpdateTask={onUpdateTask}
          />
        ) : (
          <p className="chat-bubble-text">{message.text}</p>
        )}

        <div className="chat-bubble-meta">
          <span className="chat-bubble-time">
            {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <span className="chat-bubble-read">
              {message.readBy?.length > 1 ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
