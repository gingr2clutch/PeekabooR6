-- Removes the screenshot column from peeks. The peek detail page now uses
-- the video as the single visual element, so screenshot_url is unused.

alter table peeks drop column if exists screenshot_url;
