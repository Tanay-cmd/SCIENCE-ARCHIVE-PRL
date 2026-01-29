from django.urls import path
from . import views

urlpatterns = [
    path('fits-header/', views.fits_header, name='fits_header'),
    path('headers/', views.get_headers, name='get_headers'),
] 