const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = (env, argv) => {
  // env와 argv를 받아 mode를 동적으로 설정
  const isProduction = argv.mode === 'production'

  return {
    // 1. 모드 설정 (development 또는 production)
    mode: argv.mode || 'development', // npm script에서 설정된 모드 사용

    // 2. 진입점 설정 (Entry Points for MPA)
    entry: {
      main: './src/index.js', // 루트 페이지 (index.html) 용 JavaScript
      calc_aabb: './src/calc_aabb/script.js', // calc_aabb.html 용 JavaScript
      render_threejs: './src/render_threejs/script.js', // render_threejs.html 용 JavaScript
    },

    // 3. 출력 설정 (Output)
    output: {
      // 각 엔트리 이름으로 번들 파일 생성 (main.bundle.js, calc_aabb.bundle.js 등)
      filename: isProduction
        ? 'js/[name].[contenthash].bundle.js'
        : 'js/[name].bundle.js', // 프로덕션 빌드 시 해시 추가
      path: path.resolve(__dirname, 'dist'),
      clean: true, // 빌드 전에 dist 폴더 정리
      // 절대 경로 대신 상대 경로 사용 (GitHub Pages 호환성)
      publicPath: isProduction ? './' : '/',
    },

    // 4. 개발 서버 설정 (Dev Server)
    devServer: {
      // webpack-dev-server v3.x에 맞는 설정
      contentBase: path.join(__dirname, 'dist'), // v3에서는 static 대신 contentBase 사용
      compress: true,
      port: 9000,
      open: true,
      hot: true,
      historyApiFallback: {
        rewrites: [
          { from: /^\/calc_aabb/, to: '/calc_aabb.html' },
          { from: /^\/render_threejs/, to: '/render_threejs.html' },
        ],
      },
    },

    // 5. 모듈 처리 규칙 (Module Rules)
    module: {
      rules: [
        {
          test: /\.wasm$/,
          type: 'asset/resource',
          generator: {
            filename: 'wasm/[name][ext]',
          },
        },
        // 필요하다면 다른 로더(Babel, CSS 등) 추가
      ],
    },

    // 6. 플러그인 설정 (Plugins)
    plugins: [
      // 루트 페이지 (index.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'index.html'), // 템플릿 HTML 파일 경로
        filename: 'index.html', // 출력될 HTML 파일 이름 (dist/index.html)
        chunks: ['main'], // 이 HTML에 포함될 JavaScript 청크(번들) 이름
        inject: 'body', // 스크립트 태그를 body 끝에 삽입
      }),
      // calc_aabb 페이지 (calc_aabb.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'calc_aabb', 'index.html'),
        filename: 'calc_aabb.html', // 출력될 HTML 파일 이름 (dist/calc_aabb.html)
        chunks: ['calc_aabb'], // calc_aabb 번들만 포함
        inject: 'body',
      }),
      // render_threejs 페이지 (render_threejs.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'render_threejs', 'index.html'),
        filename: 'render_threejs.html', // 출력될 HTML 파일 이름 (dist/render_threejs.html)
        chunks: ['render_threejs'], // render_threejs 번들만 포함
        inject: 'body',
      }),
    ],

    // 7. 모듈 해석 설정 (Resolve)
    resolve: {
      fallback: {
        fs: false,
        child_process: false,
        path: false,
        crypto: false,
      },
      // extensions: ['.js'], // 필요시
    },

    // 8. 소스맵 설정 (Source Maps)
    devtool: isProduction ? 'source-map' : 'inline-source-map', // 프로덕션에서는 분리된 소스맵, 개발 중에는 빠른 인라인 소스맵

    // 9. 최적화 (Optimization) - 선택 사항
    optimization: {
      splitChunks: {
        // 여러 페이지에서 공통으로 사용하는 모듈 분리 (선택 사항)
        chunks: 'all',
      },
    },
  }
}
