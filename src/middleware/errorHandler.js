export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.' },
  });
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  // Never return parser bodies, raw error messages, or stack traces.
  if (error.type === 'entity.too.large') {
    res.locals.errorCode = 'INPUT_TOO_LONG';
    return res.status(413).json({
      error: { code: 'INPUT_TOO_LONG', message: 'Dữ liệu gửi lên quá lớn.' },
    });
  }
  if (error.type === 'entity.parse.failed') {
    res.locals.errorCode = 'INVALID_JSON';
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Dữ liệu JSON không hợp lệ.' },
    });
  }
  if (error.status === 415) {
    res.locals.errorCode = 'UNSUPPORTED_MEDIA_TYPE';
    return res.status(415).json({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Định dạng dữ liệu không được hỗ trợ.' },
    });
  }
  res.locals.errorCode = 'INTERNAL_ERROR';
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' },
  });
}
