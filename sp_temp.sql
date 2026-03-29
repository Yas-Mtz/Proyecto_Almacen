DROP PROCEDURE IF EXISTS sp_crear_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_crear_solicitud(
    IN p_id_almacen    INT,
    IN p_id_personal   INT,
    IN p_observaciones VARCHAR(300),
    IN p_productos     JSON
)
BEGIN
    DECLARE v_id_solicitud  INT;
    DECLARE v_index         INT DEFAULT 0;
    DECLARE v_total         INT DEFAULT 0;
    DECLARE v_id_producto   INT;
    DECLARE v_cantidad      INT;
    DECLARE v_stock         INT;
    DECLARE v_estatus_prod  INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO solicitud (id_almacen, id_personal, observaciones_solicitud, id_estatus, fecha_solicitud)
    VALUES (p_id_almacen, p_id_personal, p_observaciones, 1, NOW());

    SET v_id_solicitud = LAST_INSERT_ID();
    SET v_total = IFNULL(JSON_LENGTH(p_productos), 0);

    WHILE v_index < v_total DO
        SET v_id_producto = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_productos, CONCAT('$[', v_index, '].id_producto'))) AS UNSIGNED);
        SET v_cantidad    = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_productos, CONCAT('$[', v_index, '].cantidad')))    AS UNSIGNED);

        SELECT cantidad, id_estatus
        INTO v_stock, v_estatus_prod
        FROM producto
        WHERE id_producto = v_id_producto
        FOR UPDATE;

        -- Omitir validación y descuento si:
        --   a) producto Inactivo (id_estatus = 2), o
        --   b) solicitud de reabastecimiento al almacén central (id_almacen = 1)
        IF v_estatus_prod != 2 AND p_id_almacen != 1 THEN
            IF v_stock < v_cantidad THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente';
            END IF;

            UPDATE producto SET cantidad = cantidad - v_cantidad WHERE id_producto = v_id_producto;
        END IF;

        INSERT INTO detalle_solicitud (id_solicitud, id_producto, cantidad)
        VALUES (v_id_solicitud, v_id_producto, v_cantidad);

        SET v_index = v_index + 1;
    END WHILE;

    COMMIT;

    SELECT v_id_solicitud AS id_solicitud;
END$$
DELIMITER ;

-- -----------------------------------------------------
-- sp_cabecera_solicitud
-- Devuelve la cabecera de una solicitud con sus joins
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_cabecera_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_cabecera_solicitud(IN p_id_solicitud INT)
BEGIN
    SELECT
        s.id_solicitud,
        a.id_almacen,
        ta.tipo_almacen,
        s.fecha_solicitud,
        p.id_personal,
        CONCAT(p.nombre_personal, ' ', p.apellido_paterno,
               IFNULL(CONCAT(' ', p.apellido_materno), '')) AS nombre,
        p.id_rol,
        r.nombre_rol,
        es.nombre_estatus,
        s.observaciones_solicitud
    FROM solicitud s
    JOIN almacen a              ON a.id_almacen            = s.id_almacen
    JOIN tipo_almacen ta        ON ta.id_talmacen          = a.id_talmacen
    JOIN estatus_solicitud es   ON es.id_estatus_solicitud = s.id_estatus
    LEFT JOIN personal p        ON p.id_personal           = s.id_personal
    LEFT JOIN rol r             ON r.id_rol                = p.id_rol
    WHERE s.id_solicitud = p_id_solicitud;
END$$
DELIMITER ;

-- -----------------------------------------------------
-- sp_productos_solicitud
-- Devuelve el detalle de productos de una solicitud
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_productos_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_productos_solicitud(IN p_id_solicitud INT)
BEGIN
    SELECT
        pr.id_producto,
        pr.nombre_producto,
        d.cantidad
    FROM detalle_solicitud d
    JOIN producto pr ON pr.id_producto = d.id_producto
    WHERE d.id_solicitud = p_id_solicitud;
END$$
DELIMITER ;

-- -----------------------------------------------------
-- sp_aprobar_solicitud
-- Valida que esté en estatus 1 (Solicitada) y la aprueba
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_aprobar_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_aprobar_solicitud(IN p_id_solicitud INT)
BEGIN
    DECLARE v_estatus INT DEFAULT NULL;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_estatus = NULL;

    SELECT id_estatus INTO v_estatus
    FROM solicitud
    WHERE id_solicitud = p_id_solicitud;

    IF v_estatus IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitud no encontrada';
    END IF;

    IF v_estatus != 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se pueden aprobar solicitudes en estado Solicitada';
    END IF;

    UPDATE solicitud SET id_estatus = 2 WHERE id_solicitud = p_id_solicitud;
END$$
DELIMITER ;

-- -----------------------------------------------------
-- sp_cancelar_solicitud
-- Valida estatus, restaura stock y cancela la solicitud
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_cancelar_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_cancelar_solicitud(IN p_id_solicitud INT)
BEGIN
    DECLARE v_estatus INT DEFAULT NULL;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_estatus = NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT id_estatus INTO v_estatus
    FROM solicitud
    WHERE id_solicitud = p_id_solicitud;

    IF v_estatus IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitud no encontrada';
    END IF;

    IF v_estatus != 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La solicitud no puede cancelarse';
    END IF;

    START TRANSACTION;

    -- Solo restaurar stock de productos activos (no Inactivos = id_estatus 2)
    UPDATE producto p
    JOIN detalle_solicitud d ON p.id_producto = d.id_producto
    SET p.cantidad = p.cantidad + d.cantidad
    WHERE d.id_solicitud = p_id_solicitud
      AND p.id_estatus != 2;

    UPDATE solicitud SET id_estatus = 3 WHERE id_solicitud = p_id_solicitud;

    COMMIT;
END$$
DELIMITER ;
