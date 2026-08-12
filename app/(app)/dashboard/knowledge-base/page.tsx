import { FileStack } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadDropzone } from "@/features/knowledge-base/components/file-upload-dropzone";
import { FileList } from "@/features/knowledge-base/components/file-list";
import { ManualTextForm } from "@/features/knowledge-base/components/manual-text-form";
import { FaqManager } from "@/features/knowledge-base/components/faq-manager";

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileStack className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">قاعدة المعرفة</h1>
          <p className="text-sm text-muted-foreground">المصدر الوحيد اللي المساعد الذكي بيرد منه</p>
        </div>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base">إضافة معلومات</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="files">
            <TabsList>
              <TabsTrigger value="files">PDF / TXT</TabsTrigger>
              <TabsTrigger value="manual">نص يدوي</TabsTrigger>
              <TabsTrigger value="faq">أسئلة شائعة</TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-6">
              <FileUploadDropzone />
              <FileList />
            </TabsContent>

            <TabsContent value="manual">
              <ManualTextForm />
            </TabsContent>

            <TabsContent value="faq">
              <FaqManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
