"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useChannelStatus,
  useConnectChannel,
  useDisconnectChannel,
} from "@/features/channels/hooks/use-channel-connection";

interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
}

const statusLabel: Record<string, { label: string; variant: "success" | "secondary" | "destructive" | "warning" }> = {
  CONNECTED: { label: "متصل", variant: "success" },
  DISCONNECTED: { label: "غير متصل", variant: "secondary" },
  ERROR: { label: "في مشكلة", variant: "destructive" },
  TOKEN_EXPIRED: { label: "التوكن منتهي", variant: "warning" },
};

export function ChannelConnectCard({
  channel,
  title,
  description,
  icon: Icon,
  fields,
  helpUrl,
}: {
  channel: "whatsapp" | "facebook" | "instagram";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldDef[];
  helpUrl: string;
}) {
  const { data: status, isLoading } = useChannelStatus(channel);
  const connect = useConnectChannel(channel);
  const disconnect = useDisconnectChannel(channel);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  const onSubmit = (values: Record<string, string>) => {
    connect.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  };

  const connected = status?.status === "CONNECTED";
  const label = status?.phoneNumber ?? status?.pageName ?? status?.username;

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{isLoading ? "..." : connected ? label : description}</CardDescription>
          </div>
        </div>
        {!isLoading && status && (() => {
          const info = statusLabel[status.status] ?? { label: "غير معروف", variant: "secondary" as const };
          return <Badge variant={info.variant}>{info.label}</Badge>;
        })()}
      </CardHeader>
      <CardContent>
        {connected ? (
          <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            {disconnect.isPending ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
            فصل الاتصال
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              ربط {title}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ربط {title}</DialogTitle>
                <DialogDescription>
                  هتحصل على البيانات دي من{" "}
                  <a href={helpUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    Meta Business Suite
                  </a>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
                {fields.map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input id={field.name} placeholder={field.placeholder} {...register(field.name, { required: true })} />
                  </div>
                ))}
                <Button type="submit" className="w-full" disabled={connect.isPending}>
                  {connect.isPending && <Loader2 className="size-4 animate-spin" />}
                  تأكيد الربط
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
