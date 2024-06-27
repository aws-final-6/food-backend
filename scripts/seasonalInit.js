const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const { connectMongoDB, disconnectMongoDB } = require('./mongo');
const Seasonal = require('../models/seasonal');

async function seasonalInit() {
  try {
    await connectMongoDB();

    const dataInsertPromises = [];

    fs.createReadStream('data/seasonal.csv')
      .pipe(csv())
      .on('data', (data) => {
        const processedData = {
          seasonal_name: data['품목명'],
          seasonal_month: parseInt(data['월별'], 10),
          seasonal_cate: data['품목분류'],
          seasonal_area: data['주요 산지'],
          seasonal_prod_time: data['생산시기'],
          seasonal_kind: data['주요 품종'],
          seasonal_efficacy: data['효능'],
          seasonal_buytip: data['구입요령'],
          seasonal_cooktip: data['조리법'],
          seasonal_preptip: data['손질요령'],
          seasonal_detail_url: data['상세페이지 URL'],
          seasonal_image_url: data['이미지 URL'],
        };

        const seasonal = new Seasonal(processedData);
        dataInsertPromises.push(
          seasonal.save()
            .then(() => {
              console.log(`데이터 삽입 성공: ${data['품목명']}`);
            })
            .catch((error) => {
              console.error(`데이터 삽입 실패: ${data['품목명']}`, error);
            })
        );
      })
      .on('end', async () => {
        try {
          await Promise.all(dataInsertPromises);
          console.log('CSV 파일의 모든 데이터가 MongoDB에 삽입되었습니다.');
        } catch (error) {
          console.error('데이터 삽입 중 오류 발생:', error);
        } finally {
          await disconnectMongoDB();
        }
      });
  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
    await disconnectMongoDB();
  }
}

seasonalInit().catch(console.dir);
