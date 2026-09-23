-- SinGluten Life — lugares cargados por usuarios.
-- Importar en phpMyAdmin con la base de las recetas seleccionada.
-- El borrado es lógico: deleted_at y delete_note conservan la observación.
-- La coordenada guardada es la del marcador. La dirección es la concatenación de los cinco campos.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `user_places` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `image` MEDIUMTEXT NOT NULL,
  `description` VARCHAR(2000) NOT NULL,
  `hours` VARCHAR(400) NOT NULL,
  `menu` TEXT NOT NULL,
  `review` VARCHAR(500) NOT NULL DEFAULT '',
  `country` VARCHAR(80) NOT NULL DEFAULT '',
  `province` VARCHAR(80) NOT NULL DEFAULT '',
  `neighborhood` VARCHAR(80) NOT NULL DEFAULT '',
  `street` VARCHAR(120) NOT NULL DEFAULT '',
  `street_number` VARCHAR(20) NOT NULL DEFAULT '',
  `address` VARCHAR(300) NOT NULL,
  `lat` DOUBLE NOT NULL,
  `lon` DOUBLE NOT NULL,
  `author_id` VARCHAR(80) NOT NULL,
  `author_name` VARCHAR(60) NOT NULL,
  `author_picture` VARCHAR(2000) NOT NULL DEFAULT '',
  `author_provider` VARCHAR(16) NOT NULL DEFAULT 'google',
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  `deleted_at` BIGINT NULL,
  `delete_note` VARCHAR(400) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_author` (`author_id`),
  KEY `idx_active` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
