ALTER TABLE `professionals` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `professionals` ADD `projects` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `professionals_user_id_unique` ON `professionals` (`user_id`);