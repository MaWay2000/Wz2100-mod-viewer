	if ( typeof glVersion === 'string' ) {
		if ( glVersion.indexOf( 'WebGL' ) !== - 1 ) {
			version = parseFloat( /^WebGL (\d)/.exec( glVersion )[ 1 ] );
			lineWidthAvailable = ( version >= 1.0 );
		} else if ( glVersion.indexOf( 'OpenGL ES' ) !== - 1 ) {

			version = parseFloat( /^OpenGL ES (\d)/.exec( glVersion )[ 1 ] );
			lineWidthAvailable = ( version >= 2.0 );

		}
