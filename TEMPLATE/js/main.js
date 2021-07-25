
window.onload = function() {
	$( "#target" ).keyup(function() {
	  console.log( $( this ).val() );
	});

	$("#range1").on('input', function() {
	  console.log(this.value);
	})
}

