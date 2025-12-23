import 'package:dio/dio.dart';

/// Converts technical errors to user-friendly messages
class ErrorHandler {
  static String getErrorMessage(dynamic error) {
    if (error is DioException) {
      return _handleDioError(error);
    }

    final errorStr = error.toString().toLowerCase();

    if (errorStr.contains('connection refused') ||
        errorStr.contains('socketexception')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }

    if (errorStr.contains('timeout')) {
      return 'Connection timeout. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  static String _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout. Please try again.';

      case DioExceptionType.connectionError:
        return 'Unable to connect to server. Please check your internet connection.';

      case DioExceptionType.badResponse:
        return _handleStatusCode(error.response?.statusCode, error.response?.data);

      case DioExceptionType.cancel:
        return 'Request was cancelled.';

      default:
        return 'Connection error. Please try again.';
    }
  }

  static String _handleStatusCode(int? statusCode, dynamic data) {
    // Try to extract error message from response
    String? serverMessage;
    if (data is Map<String, dynamic>) {
      serverMessage = data['detail'] ?? data['message'] ?? data['error'];
    }

    switch (statusCode) {
      case 400:
        return serverMessage ?? 'Invalid request. Please check your input.';
      case 401:
        return 'Invalid email or password.';
      case 403:
        return 'Access denied. Please login again.';
      case 404:
        return 'Service not available.';
      case 409:
        return serverMessage ?? 'This email is already registered.';
      case 422:
        return serverMessage ?? 'Please check your input data.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return serverMessage ?? 'An error occurred. Please try again.';
    }
  }
}
