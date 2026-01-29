from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from astropy.io import fits
import os

# Create your views here.

@api_view(['GET'])
def fits_header(request):
    """
    Get FITS header information from a file
    """
    fits_file = request.GET.get('file')
    
    if not fits_file:
        return Response(
            {'error': 'No file specified'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not os.path.exists(fits_file):
        return Response(
            {'error': f'File not found: {fits_file}'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        with fits.open(fits_file) as hdul:
            header = hdul[0].header
            header_list = [
                {
                    'Keyword': card.keyword, 
                    'Value': str(card.value), 
                    'Comment': card.comment
                }
                for card in header.cards
            ]
        return Response(header_list)
    except Exception as e:
        print(f"Error opening FITS file: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_headers(request):
    """
    Get request headers
    """
    headers_dict = dict(request.headers)
    return Response(headers_dict)
