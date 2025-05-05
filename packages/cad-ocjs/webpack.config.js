// webpack.config.js

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin') // CopyWebpackPlugin 가져오기

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
      glb_viewer: './src/glb_viewer/glb_viewer.js', // glb_viewer.html 용 JavaScript
    },

    // 3. 출력 설정 (Output)
    output: {
      // 각 엔트리 이름으로 번들 파일 생성 (main.bundle.js, calc_aabb.bundle.js 등)
      filename: isProduction
        ? 'js/[name].[contenthash].bundle.js' // 프로덕션 빌드 시 내용 기반 해시 추가
        : 'js/[name].bundle.js', // 개발 빌드 시 간단한 이름 사용
      path: path.resolve(__dirname, 'dist'), // 빌드 결과물이 생성될 경로 (프로젝트 루트/dist)
      clean: true, // 빌드 전에 dist 폴더 정리
      // GitHub Pages 등 상대 경로가 필요할 수 있는 환경을 위한 설정
      publicPath: isProduction ? './' : '/', // 프로덕션은 상대경로, 개발은 루트경로
    },

    // 4. 개발 서버 설정 (Dev Server)
    devServer: {
      // webpack-dev-server v3.x 설정 (만약 v4+ 로 업데이트했다면 static 사용 필요)
      contentBase: path.join(__dirname, 'dist'), // 정적 파일 제공 경로 (dist 폴더)
      // 참고: v4+ 에서는 static: { directory: path.join(__dirname, 'dist') }
      compress: true, // gzip 압축 사용
      port: 9000, // 개발 서버 포트
      hot: true, // Hot Module Replacement(HMR) 활성화
      // MPA(Multi-Page Application) 환경에서 페이지 새로고침 시 올바른 HTML 파일을 찾도록 설정
      historyApiFallback: {
        rewrites: [
          { from: /^\/calc_aabb/, to: '/calc_aabb.html' },
          { from: /^\/render_threejs/, to: '/render_threejs.html' },
          { from: /^\/glb_viewer/, to: '/glb_viewer.html' },
          // 필요한 다른 페이지 규칙 추가 가능
          { from: /./, to: '/index.html' }, // 다른 모든 경로는 index.html로 (SPA 동작 유사)
        ],
      },
    },

    // 5. 모듈 처리 규칙 (Module Rules)
    module: {
      rules: [
        // WebAssembly 파일 처리 규칙
        {
          test: /\.wasm$/,
          type: 'asset/resource', // 파일을 별도 리소스로 처리
          generator: {
            filename: 'wasm/[name][ext]', // dist/wasm 폴더 아래에 저장
          },
        },
      ],
    },

    // 6. 플러그인 설정 (Plugins)
    plugins: [
      // 루트 페이지 (index.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'index.html'), // 원본 HTML 템플릿 파일
        filename: 'index.html', // 출력될 HTML 파일 이름 (dist/index.html)
        chunks: ['main'], // 이 HTML에 포함될 JavaScript 번들 이름
        inject: 'body', // 스크립트 태그를 <body> 끝에 삽입
      }),
      // calc_aabb 페이지 (calc_aabb.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'calc_aabb', 'index.html'),
        filename: 'calc_aabb.html',
        chunks: ['calc_aabb'],
        inject: 'body',
      }),
      // render_threejs 페이지 (render_threejs.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'render_threejs', 'index.html'),
        filename: 'render_threejs.html',
        chunks: ['render_threejs'],
        inject: 'body',
      }),
      // glb_viewer 페이지 (glb_viewer.html) 생성
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src', 'glb_viewer', 'glb_viewer.html'),
        filename: 'glb_viewer.html',
        chunks: ['glb_viewer'],
        inject: 'body',
      }),

      // public 폴더 내용을 dist 폴더로 복사하는 설정
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public'), // 프로젝트 루트의 'public' 폴더를
            to: path.resolve(__dirname, 'dist'), // 'dist' 폴더로 복사
            globOptions: {
              // 특정 파일이나 폴더를 제외하고 싶다면 여기에 패턴 추가
              // ignore: ['**/ignored.txt'],
            },
            noErrorOnMissing: true, // 'public' 폴더가 없어도 오류 내지 않음
          },
        ],
      }),
    ],

    // 7. 소스맵 설정 (Source Maps)
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    // 프로덕션: 'source-map' (별도 파일 생성, 디버깅에 유용하지만 느림)
    // 개발: 'inline-source-map' (번들에 포함, 빠르지만 파일 크기 증가)

    // 8. 최적화 (Optimization)
    optimization: {
      splitChunks: {
        // 여러 페이지(entry point)에서 공통으로 사용하는 모듈을 별도 파일로 분리
        chunks: 'all', // 모든 종류의 청크(초기, 비동기)에 대해 코드 분할 적용
        // 기본 설정으로도 충분하지만, 필요시 세부 설정 가능
      },
    },

    // 9. 성능 관련 힌트 설정 (Performance Hints) - 선택 사항
    performance: {
      hints: isProduction ? 'warning' : false, // 프로덕션 빌드 시 에셋/엔트리포인트 크기가 클 경우 경고 표시
    },
  }
}
