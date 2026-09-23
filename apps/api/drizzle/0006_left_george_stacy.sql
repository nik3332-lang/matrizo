ALTER TABLE `categories` ADD `colour` text;
--> statement-breakpoint
UPDATE categories SET colour = CASE WHEN lower(slug) LIKE 'upvc%' THEN '#ffffff' WHEN lower(slug) LIKE 'cpvc%' THEN '#ffdf00' ELSE '#808080' END WHERE lower(slug) LIKE 'upvc%' OR lower(slug) LIKE 'cpvc%' OR lower(slug) LIKE 'pvc%';
