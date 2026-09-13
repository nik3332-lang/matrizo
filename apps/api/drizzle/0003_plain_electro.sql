ALTER TABLE `products` ADD `specs` text;--> statement-breakpoint
ALTER TABLE `products` ADD `gst_invoice_eligible` integer DEFAULT false NOT NULL;