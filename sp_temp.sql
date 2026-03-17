DROP PROCEDURE IF EXISTS sp_crear_solicitud;

DELIMITER $$
CREATE PROCEDURE sp_crear_solicitud(
    IN p_id_almacen    INT,
    IN p_id_personal   INT,
    IN p_observaciones VARCHAR(300),
    IN p_productos     JSON
)
BEGIN
    DECLARE v_id_solicitud INT;
    DECLARE v_index        INT DEFAULT 0;
    DECLARE v_total        INT DEFAULT 0;
    DECLARE v_id_producto  INT;
    DECLARE v_cantidad     INT;
    DECLARE v_stock        INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error al crear la solicitud';
    END;

    START TRANSACTION;

    INSERT INTO solicitud (id_almacen, id_personal, observaciones_solicitud, id_estatus, fecha_solicitud)
    VALUES (p_id_almacen, p_id_personal, p_observaciones, 1, NOW());

    SET v_id_solicitud = LAST_INSERT_ID();
    SET v_total = IFNULL(JSON_LENGTH(p_productos), 0);

    WHILE v_index < v_total DO
        SET v_id_producto = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_productos, CONCAT('$[', v_index, '].id_producto'))) AS UNSIGNED);
        SET v_cantidad    = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_productos, CONCAT('$[', v_index, '].cantidad')))    AS UNSIGNED);

        SELECT cantidad INTO v_stock FROM producto WHERE id_producto = v_id_producto FOR UPDATE;

        IF v_stock < v_cantidad THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente';
        END IF;

        INSERT INTO detalle_solicitud (id_solicitud, id_producto, cantidad)
        VALUES (v_id_solicitud, v_id_producto, v_cantidad);

        UPDATE producto SET cantidad = cantidad - v_cantidad WHERE id_producto = v_id_producto;

        SET v_index = v_index + 1;
    END WHILE;

    COMMIT;

    SELECT s.id_solicitud, s.fecha_solicitud, es.nombre_estatus, a.id_almacen, ta.tipo_almacen
    FROM solicitud s
    JOIN estatus_solicitud es ON es.id_estatus_solicitud = s.id_estatus
    JOIN almacen a            ON a.id_almacen            = s.id_almacen
    JOIN tipo_almacen ta      ON ta.id_talmacen          = a.id_talmacen
    WHERE s.id_solicitud = v_id_solicitud;
END$$
DELIMITER ;
