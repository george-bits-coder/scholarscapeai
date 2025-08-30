import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Message } from "@shared/schema";

type MessageWithSender = Message & { sender: User };

export default function MessagesPage() {
  const [location, navigate] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  
  // Get the 'to' parameter from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const recipientId = urlParams.get('to');

  // Get messages
  const { data: messages = [], refetch } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages"],
    enabled: !!recipientId,
  });

  // Get recipient info
  const { data: recipient } = useQuery<User>({
    queryKey: [`/api/researchers/${recipientId}`],
    enabled: !!recipientId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !recipientId) return;
      
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: recipientId,
        content: newMessage.trim(),
        type: "direct",
      });
      return await res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetch();
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate();
    }
  };

  if (!recipientId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">Select a user to start messaging</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {recipient && (
              <>
                <Avatar>
                  <AvatarFallback>{recipient.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">{recipient.name}</h1>
                  <p className="text-sm text-muted-foreground">{recipient.email}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="space-y-6">
          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 pr-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="flex gap-3 p-3 rounded-lg bg-muted/20"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {message.sender.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {message.sender.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.createdAt ? new Date(message.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Send Message */}
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                data-testid="textarea-message"
              />
              
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}