import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Hash } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import type { ProjectChat as ChatType, ProjectChatMessage, ProjectChatMember, User } from "@shared/schema";

interface ProjectChatProps {
  projectId: string;
  projectTitle: string;
}

export function ProjectChat({ projectId, projectTitle }: ProjectChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get chat details
  const { data: chat, isLoading: chatLoading } = useQuery<ChatType>({
    queryKey: [`/api/projects/${projectId}/chat`],
  });

  // Get chat messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<(ProjectChatMessage & { sender: User })[]>({
    queryKey: [`/api/chats/${chat?.id}/messages`],
    enabled: !!chat?.id,
  });

  // Get chat members
  const { data: members = [], isLoading: membersLoading } = useQuery<(ProjectChatMember & { user: User })[]>({
    queryKey: [`/api/chats/${chat?.id}/members`],
    enabled: !!chat?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!chat) throw new Error("Chat not available");
      const res = await apiRequest("POST", `/api/chats/${chat.id}/messages`, { content });
      return await res.json();
    },
    onSuccess: () => {
      if (chat) {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chat.id}/messages`] });
      }
      setNewMessage("");
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && chat) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return format(date, "HH:mm");
    } else if (diffInDays === 1) {
      return `Yesterday ${format(date, "HH:mm")}`;
    } else {
      return format(date, "MMM d, HH:mm");
    }
  };

  if (chatLoading || !chat) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          {chatLoading ? "Loading chat..." : "Chat not available"}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Sidebar with members */}
      <div className="w-64 border-r bg-muted/20">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4" />
            <span className="font-semibold text-sm">{chat.name}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {chat.description || projectTitle}
          </p>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Members ({members.length})</span>
          </div>
          
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {member.user?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{member.user?.name}</span>
                {member.role === "owner" && (
                  <Badge variant="secondary" className="text-xs">Owner</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messagesLoading ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index: number) => {
                const isCurrentUser = message.senderId === user?.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showHeader = !prevMessage || 
                  prevMessage.senderId !== message.senderId ||
                  new Date(message.createdAt!).getTime() - new Date(prevMessage.createdAt!).getTime() > 300000; // 5 minutes

                return (
                  <div key={message.id} className="group">
                    {showHeader ? (
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="text-sm">
                            {message.sender?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {message.sender?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.createdAt!)}
                            </span>
                          </div>
                          <p className="text-sm break-words">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 hover:bg-muted/20 -mx-2 px-2 py-1 rounded">
                        <div className="w-8 flex justify-center">
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                            {format(new Date(message.createdAt!), "HH:mm")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words">{message.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${chat.name}`}
              className="flex-1"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}