-- SinGluten Life — recetas de la comunidad
-- Importar en phpMyAdmin con la base u290440545_Recetas seleccionada.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `community_recipes`;

CREATE TABLE `community_recipes` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(80) NOT NULL,
  `summary` VARCHAR(220) NOT NULL DEFAULT '',
  `minutes` SMALLINT NOT NULL DEFAULT 30,
  `servings` TINYINT NOT NULL DEFAULT 2,
  `difficulty` VARCHAR(16) NOT NULL DEFAULT 'Fácil',
  `tags` TEXT NOT NULL,
  `ingredients` TEXT NOT NULL,
  `steps` TEXT NOT NULL,
  `image` MEDIUMTEXT NOT NULL,
  `source_name` VARCHAR(60) NOT NULL DEFAULT '',
  `source_url` VARCHAR(255) NOT NULL DEFAULT '',
  `author_id` VARCHAR(80) NOT NULL DEFAULT '',
  `author_name` VARCHAR(60) NOT NULL DEFAULT '',
  `author_picture` VARCHAR(2000) NOT NULL DEFAULT '',
  `author_provider` VARCHAR(16) NOT NULL DEFAULT 'google',
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `community_recipes` (
  `id`, `title`, `summary`, `minutes`, `servings`, `difficulty`,
  `tags`, `ingredients`, `steps`, `image`,
  `source_name`, `source_url`, `author_id`, `author_name`,
  `author_picture`, `author_provider`, `created_at`
) VALUES
(
  'c-mu1oc8x6qi',
  'Budín de naranja de la abuela',
  'Harina de arroz, naranja y un molde de siempre.',
  30,
  2,
  'Fácil',
  '["Almuerzo","Postre"]',
  '[{"name":"Harina de arroz","qty":"200 g","shop":"almacen"}]',
  '["Mezclar, hornear 35 minutos y dejar enfriar."]',
  '',
  'Leo',
  '',
  'google:local:leo',
  'Leo',
  '',
  'google',
  1789416428610
),
(
  'c-testmesa1',
  'Tortilla de papa sin TACC',
  'La de siempre, con harina de arroz para ligar.',
  35,
  4,
  'Fácil',
  '["Almuerzo"]',
  '[{"name":"Papas","qty":"4","shop":"verduleria"},{"name":"Huevos","qty":"4 u","shop":"almacen"}]',
  '["Hervir las papas y aplastarlas.","Batir los huevos, mezclar y dorar."]',
  '',
  'Leo',
  '',
  'google:local:leo',
  'Leo',
  '',
  'google',
  1789416163561
);

SET FOREIGN_KEY_CHECKS = 1;
