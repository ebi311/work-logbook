CREATE TABLE "work_log_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_log_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_log_tags" ADD CONSTRAINT "work_log_tags_work_log_id_work_logs_id_fk" FOREIGN KEY ("work_log_id") REFERENCES "public"."work_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_log_tags_work_log_id_tag_unique" ON "work_log_tags" USING btree ("work_log_id","tag");--> statement-breakpoint
CREATE INDEX "work_log_tags_tag_idx" ON "work_log_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "work_log_tags_work_log_id_idx" ON "work_log_tags" USING btree ("work_log_id");