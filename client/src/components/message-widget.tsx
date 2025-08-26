import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X } from "lucide-react";

export default function MessageWidget() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch recent messages
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/messages"],
  });

  const unreadMessages = messages.filter((m: any) => !m.readAt);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Message List */}
      {isOpen && (
        <Card className="w-80 mb-4 shadow-lg" data-testid="message-widget">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Recent Messages</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-messages"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {messages.slice(0, 5).map((message: any) => (
                <div 
                  key={message.id} 
                  className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  data-testid="message-item"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.sender?.profileImage} />
                    <AvatarFallback>
                      {message.sender?.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {message.sender?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {message.content}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No messages yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-blue-700 relative"
        size="icon"
        data-testid="button-toggle-messages"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadMessages.length > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
            data-testid="unread-message-count"
          >
            {unreadMessages.length}
          </Badge>
        )}
      </Button>
    </div>
  );
}
