const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
// const CopyPlugin = require('copy-webpack-plugin'); // 이제 필요 없습니다. HtmlWebpackPlugin이 처리합니다.

module.exports = {
  // 1. 모드 설정 (개발 또는 프로덕션)
  mode: 'development', // 'production'으로 변경하여 최적화된 빌드 가능

  // 2. 진입점 설정 (Entry Point)
  // src/index.js 파일을 유일한 진입점으로 사용합니다.
  entry: './src/index.js',

  // 3. 출력 설정 (Output)
  output: {
    // 번들된 결과 파일 이름 (main.bundle.js 와 같이 생성됨)
    filename: '[name].bundle.js',
    // 빌드 결과물이 생성될 경로 (프로젝트 루트의 dist 폴더)
    path: path.resolve(__dirname, 'dist'),
    // 빌드 전에 output.path 디렉토리 (dist) 를 정리합니다.
    clean: true,
    // Asset Modules (예: Wasm) 이 참조될 기본 public 경로 설정 (선택 사항)
    // publicPath: '/', // 필요에 따라 설정
  },

  // 4. 개발 서버 설정 (Dev Server)
  devServer: {
    // static 대신 contentBase 사용 (v3 이하)
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
    open: true,
    hot: true,
  },

  // 5. 모듈 처리 규칙 (Module Rules)
  module: {
    rules: [
      {
        // .wasm 파일 처리 규칙
        test: /\.wasm$/,
        // Webpack 5의 내장 Asset Modules 사용 (file-loader/url-loader 대체)
        type: 'asset/resource',
        generator: {
          // Wasm 파일을 dist/wasm 폴더 아래에 원본 파일명으로 저장
          filename: 'wasm/[name][ext]',
        },
      },
      // 필요한 경우 다른 로더 추가 (예: Babel 로더, CSS 로더 등)
      // {
      //   test: /\.js$/,
      //   exclude: /node_modules/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       presets: ['@babel/preset-env', '@babel/preset-react'] // 예시
      //     }
      //   }
      // },
      // {
      //   test: /\.css$/i,
      //   use: ['style-loader', 'css-loader'],
      // },
    ],
  },

  // 6. 플러그인 설정 (Plugins)
  plugins: [
    // HTML 파일을 생성하고, 빌드된 번들 스크립트를 자동으로 주입합니다.
    new HtmlWebpackPlugin({
      // 템플릿으로 사용할 HTML 파일 경로
      template: path.join(__dirname, 'src', 'index.html'),
      // 생성될 HTML 파일 이름 (dist/index.html)
      filename: 'index.html',
      // 주입할 청크 (단일 진입점이므로 기본 'main' 청크가 자동으로 주입됨)
      // chunks: ['main'] // 명시적으로 지정할 수도 있음
    }),
    // CopyPlugin은 HtmlWebpackPlugin이 템플릿 기반으로 index.html을 생성하므로 제거합니다.
  ],

  // 7. 모듈 해석 설정 (Resolve)
  resolve: {
    // Node.js 코어 모듈에 대한 폴리필(polyfill) 비활성화
    fallback: {
      fs: false,
      child_process: false,
      path: false,
      crypto: false,
    },
    // 필요한 경우 확장자나 별칭(alias) 설정 추가
    // extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // alias: {
    //   '@components': path.resolve(__dirname, 'src/components'),
    // }
  },

  // 8. 소스맵 설정 (Source Maps) - 디버깅용
  devtool: 'inline-source-map', // 개발 중에는 상세한 소스맵 사용
}
