$(document).ready(function() {
    // Cuando se haga clic en el perfil del usuario
    $('#userProfile').click(function() {
        // Alterna la visibilidad del menú desplegable
        $('#dropdownMenu').toggle();
    });

    // Si quieres cerrar el menú cuando se haga clic fuera de él
    $(document).click(function(event) {
        if (!$(event.target).closest('#userProfile').length && !$(event.target).closest('#dropdownMenu').length) {
            $('#dropdownMenu').hide(); // Ocultar el menú
        }
    });
});
