'use client';

import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import Messages, { MessageType } from '@/components/script/messages';
import ChatBar from '@/components/script/chatBar';
import ToolForm from '@/components/script/form';
import Loading from '@/components/loading';
import { Button } from '@nextui-org/react';
import { getWorkspaceDir } from '@/actions/workspace';
import { getGatewayUrl } from '@/actions/gateway';
import { ScriptContext } from '@/contexts/script';
import AssistantNotFound from '@/components/assistant-not-found';
import { generateThreadName, renameThread } from '@/actions/threads';

interface ScriptProps {
  className?: string;
  messagesHeight?: string;
  enableThreads?: boolean;
  showAssistantName?: boolean;
}

const Script: React.FC<ScriptProps> = ({
  className,
  messagesHeight = 'h-full',
  showAssistantName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, _setInputValue] = useState<string>('');
  const {
    script,
    scriptDisplayName,
    tool,
    showForm,
    setShowForm,
    formValues,
    setFormValues,
    setHasRun,
    hasParams,
    messages,
    setMessages,
    thread,
    socket,
    connected,
    running,
    notFound,
    restartScript,
    fetchThreads,
  } = useContext(ScriptContext);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, inputValue]);

  useEffect(() => {
    const smallBody = document.getElementById('small-message');
    if (smallBody) smallBody.scrollTop = smallBody.scrollHeight;
  }, [messages, connected, running]);

  const handleFormSubmit = () => {
    setShowForm(false);
    setMessages([]);
    getWorkspaceDir().then(async (workspace) => {
      socket?.emit(
        'run',
        `${await getGatewayUrl()}/${script}`,
        tool.name,
        formValues,
        workspace,
        thread
      );
    });
    setHasRun(true);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [event.target.name]: event.target.value,
    }));
  };

  const hasNoUserMessages = useCallback(
    () => messages.filter((m) => m.type === MessageType.User).length === 0,
    [messages]
  );

  const handleMessageSent = async (message: string) => {
    if (!socket || !connected) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { type: MessageType.User, message },
    ]);
    if (hasNoUserMessages() && thread) {
      renameThread(thread, await generateThreadName(message));
      fetchThreads();
    }
    socket.emit('userMessage', message, thread);
  };

  return (
    <div className={`h-full w-full ${className}`}>
      {connected || (showForm && hasParams) ? (
        <>
          <div
            id="small-message"
            className={`overflow-y-auto w-full items-center ${messagesHeight}`}
          >
            {showForm && hasParams ? (
              <ToolForm
                tool={tool}
                formValues={formValues}
                handleInputChange={handleInputChange}
              />
            ) : (
              <div>
                {showAssistantName && (
                  <div className="sticky top-0 p-4 z-50 bg-background">
                    <h1 className="text-2xl font-medium truncate">
                      {scriptDisplayName ?? ''}
                    </h1>
                  </div>
                )}
                <Messages restart={restartScript} messages={messages} />
              </div>
            )}
          </div>

          <div className="w-full ">
            {showForm && hasParams ? (
              <Button
                className="mt-4 w-full"
                type="submit"
                color={tool.chat ? 'primary' : 'secondary'}
                onPress={handleFormSubmit}
                size="lg"
              >
                {tool.chat ? 'Start chat' : 'Run script'}
              </Button>
            ) : (
              <ChatBar disabled={!running} onMessageSent={handleMessageSent} />
            )}
          </div>
        </>
      ) : notFound ? (
        <AssistantNotFound />
      ) : (
        <Loading>Loading your assistant...</Loading>
      )}
    </div>
  );
};

export default Script;
