CREATE TABLE `paint_shades` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL,
	`name` text NOT NULL,
	`hex` text NOT NULL,
	`image_url` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX `cart_items_user_product_idx`;--> statement-breakpoint
ALTER TABLE `cart_items` ADD `shade_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_items` ADD `shade` text;--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_user_product_shade_idx` ON `cart_items` (`user_id`,`product_id`,`shade_id`);--> statement-breakpoint
ALTER TABLE `categories` ADD `colour_selection` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `shade` text;
--> statement-breakpoint
UPDATE categories SET colour_selection=1 WHERE lower(slug)='paints';
--> statement-breakpoint
INSERT INTO paint_shades (id,family,name,hex,sort_order) VALUES
('mz-blue-01','Blue','Matrizo Blue 01','#D8EAF2',1),
('mz-blue-02','Blue','Matrizo Blue 02','#6F9FBB',2),
('mz-blue-03','Blue','Matrizo Blue 03','#315875',3),
('mz-green-01','Green','Matrizo Green 01','#D6E5CE',4),
('mz-green-02','Green','Matrizo Green 02','#6F9178',5),
('mz-yellow-01','Yellow','Matrizo Yellow 01','#F3DF94',6),
('mz-red-01','Red','Matrizo Red 01','#B95D61',7),
('mz-pink-01','Pink','Matrizo Pink 01','#EBC9D2',8),
('mz-purple-01','Purple','Matrizo Purple 01','#B9A8CC',9),
('mz-orange-01','Orange','Matrizo Orange 01','#E5AE86',10),
('mz-neutral-01','Neutral','Matrizo Neutral 01','#F4F3EF',11),
('mz-grey-01','Grey','Matrizo Grey 01','#93989A',12);
