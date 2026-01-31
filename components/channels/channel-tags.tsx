"use client";

import { useState, useTransition } from "react";
import { Loader2, X, Plus, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateChannelTags } from "@/app/actions/channels";

const SUGGESTED_TAGS = [
  "Frontend",
  "Backend",
  "DevOps",
  "Mobile",
  "AI/ML",
  "Security",
  "Database",
  "Cloud",
  "Testing",
  "Architecture",
];

interface ChannelTagsProps {
  channelId: string;
  tags: string[];
  compact?: boolean;
}

export function ChannelTags({ channelId, tags: initialTags, compact = false }: ChannelTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      startTransition(async () => {
        await updateChannelTags(channelId, newTags);
      });
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    startTransition(async () => {
      await updateChannelTags(channelId, newTags);
    });
  };

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1">
            <Tag className="h-3 w-3" />
            {tags.length > 0 ? (
              <span className="text-xs">{tags.length}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Добавить</span>
            )}
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Теги канала</div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="ml-1 h-2 w-2" />
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-1">
              <Input
                placeholder="Новый тег..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newTag);
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTag(newTag)}
                disabled={!newTag}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                .slice(0, 6)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer text-xs hover:bg-muted"
                    onClick={() => addTag(tag)}
                  >
                    <Plus className="mr-1 h-2 w-2" />
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Теги</span>
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Добавить тег..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(newTag);
            }
          }}
          className="h-8"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => addTag(newTag)}
          disabled={!newTag}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer text-xs hover:bg-muted"
            onClick={() => addTag(tag)}
          >
            <Plus className="mr-1 h-2 w-2" />
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
