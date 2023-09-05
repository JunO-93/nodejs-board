const paginator = require("../utils/paginator");

//글쓰기
async function writePost(collection, post) { //글쓰기함수
    post.hits = 0;
    post.createdDt = new Date().toISOString(); //날짜는 ISO 포맷으로 저장
    return await collection.insertOne(post); //몽고디비에 post를 저장 후 결과 반환
}

//리스트
async function list(collection, page, search) {
    const perPage = 10;
    const query = { title: new RegExp(search, "i") };
    const cursor = collection.find(query, { limit: perPage, skip: (page - 1) * perPage }).sort({
        createdDt: -1,
    });

    const totalCount = await collection.count(query);
    const posts = await cursor.toArray();

    const paginatorObj = paginator({ totalCount, page, erPage: perPage });
    return [posts, paginatorObj];
}

module.exports = { //require()로 파일을 임포트 시 외부로 노출하는 객체
    list,
    writePost,
};