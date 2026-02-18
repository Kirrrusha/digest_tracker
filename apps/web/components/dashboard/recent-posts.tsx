import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Post {
  id: string;
  title: string | null;
  contentPreview: string | null;
  url: string | null;
  publishedAt: Date;
  channel: {
    id: string;
    name: string;
    sourceType: string;
  };
}

interface RecentPostsProps {
  posts: Post[];
}

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Последние посты</CardTitle>
          <CardDescription>Посты из ваших каналов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Пока нет постов. Добавьте каналы, чтобы начать получать контент.
            </p>
            <Link href="/dashboard/channels">
              <Button>Добавить канал</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние посты</CardTitle>
        <CardDescription>Посты из ваших каналов за последние дни</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {post.channel.sourceType === "telegram" ? "TG" : "RSS"}
                  </Badge>
                  <span className="text-sm text-muted-foreground truncate">
                    {post.channel.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(post.publishedAt, {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>
                {post.title && <h4 className="font-medium mb-1 line-clamp-1">{post.title}</h4>}
                <p className="text-sm text-muted-foreground line-clamp-2">{post.contentPreview}</p>
              </div>
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/dashboard/channels">
            <Button variant="ghost">Смотреть все</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
